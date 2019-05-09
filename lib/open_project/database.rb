#-- encoding: UTF-8
#-- copyright
# OpenProject is a project management system.
# Copyright (C) 2012-2018 the OpenProject Foundation (OPF)
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License version 3.
#
# OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
# Copyright (C) 2006-2017 Jean-Philippe Lang
# Copyright (C) 2010-2013 the ChiliProject Team
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
#
# See docs/COPYRIGHT.rdoc for more details.
#++
require 'semantic'

module OpenProject
  # This module provides some information about the currently used database
  # adapter. It can be used to write code specific to certain database
  # vendors which, while not not encouraged, is sometimes necessary due to
  # syntax differences.

  module Database
    DB_VALUE_FALSE = 'f'.freeze
    DB_VALUE_TRUE = 't'.freeze

    class InsufficientVersionError < StandardError; end

    # This method returns a hash which maps the identifier of the supported
    # adapter to a regex matching the adapter_name.
    def self.supported_adapters
      @adapters ||= begin
        {
          mysql: /mysql/i,
          postgresql: /postgres/i
        }
      end
    end

    ##
    # Get the database system requirements
    def self.required_versions
      {
        postgresql: {
          numeric: 90500, # PG_VERSION_NUM
          string: '9.5.0',
          enforced: true
        },
        mysql: {
          string: '5.6.0',
          enforced: false
        }
      }
    end

    ##
    # Check pending database migrations
    # and cache the result for up to one hour
    def self.migrations_pending?(ensure_fresh: false)
      cache_key = OpenProject::Cache::CacheKey.key('database_migrations')
      cached_result = Rails.cache.read(cache_key)

      # Ensure cache is busted if result is positive or unset
      # and the value was cached
      if ensure_fresh || cached_result != false
        fresh_result = connection.migration_context.needs_migration?
        Rails.cache.write(cache_key, expires_in: 1.hour)
        return fresh_result
      end

      false
    end

    ##
    # Check the database version compatibility.
    # Raises an +InsufficientVersionError+ when the version is incompatible
    def self.check_version!
      required = required_versions[name]
      current = version

      return if version_matches?
      message = "Database server version mismatch: Required version is #{required[:string]}, " \
                "but current version is #{current}"

      if required[:enforced]
        raise InsufficientVersionError.new message
      else
        warn "#{message}. Version is not enforced for this database however, so continuing with this version."
      end
    end

    ##
    # Return +true+ if the required version is matched by the current connection.
    def self.version_matches?
      required = required_versions[name]

      case name
      when :mysql
        true
      when :postgresql
        numeric_version >= required[:numeric]
      end
    end

    # Get the raw name of the currently used database adapter.
    # This string is set by the used adapter gem.
    def self.adapter_name(connection = self.connection)
      connection.adapter_name
    end

    # Get the AR base connection object handle
    # will open a db connection implicitly
    def self.connection
      ActiveRecord::Base.connection
    end

    # returns the identifier of the specified connection
    # (defaults to ActiveRecord::Base.connection)
    def self.name(connection = self.connection)
      supported_adapters.find(proc { [:unknown, //] }) { |_adapter, regex|
        adapter_name(connection) =~ regex
      }[0]
    end

    # Provide helper methods to quickly check the database type
    # OpenProject::Database.mysql? returns true, if we have a MySQL DB
    # Also allows specification of a connection e.g.
    # OpenProject::Database.mysql?(my_connection)
    supported_adapters.keys.each do |adapter|
      (class << self; self; end).class_eval do
        define_method(:"#{adapter.to_s}?") do |connection = self.connection|
          send(:name, connection) == adapter
        end
      end
    end

    # Return the version of the underlying database engine.
    # Set the +raw+ argument to true to return the unmangled string
    # from the database.
    def self.version(raw = false)
      @version ||= case name
                   when :mysql
                     ActiveRecord::Base.connection.select_value('SELECT VERSION()')
                   when :postgresql
                     ActiveRecord::Base.connection.select_value('SELECT version()')
                   end

      if name == :postgresql
        raw ? @version : @version.match(/\APostgreSQL (\S+)/i)[1]
      else
        @version
      end
    end

    def self.semantic_version(version_string = self.version)
      Semantic::Version.new version_string
    rescue ArgumentError
      # Cut anything behind the -
      Semantic::Version.new version_string.gsub(/\-.+$/, '')
    end

    def self.numeric_version
      case name
      when :mysql
        raise ArgumentError, "Can't get numeric version of MySQL"
      when :postgresql
        ActiveRecord::Base.connection.select_value('SHOW server_version_num;').to_i
      end
    end

    # Return if the version of the underlying database engine is capable of TSVECTOR features, needed for full-text
    # search.
    def self.allows_tsv?
      OpenProject::Database.name == :postgresql &&
        Gem::Version.new(OpenProject::Database.version) >= Gem::Version.new('9.5')
    end
  end
end
