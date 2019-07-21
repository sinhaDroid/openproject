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

require_relative '../filters'

module Components
  module WorkPackages
    module TableConfiguration
      class Filters < ::Components::WorkPackages::Filters
        attr_reader :modal

        def initialize
          @modal = ::Components::WorkPackages::TableConfigurationModal.new
        end

        def open
          modal.open_and_switch_to 'Filters'
          expect_open
        end

        def save
          modal.save
        end

        def expect_filter_count(count)
          within(modal.selector) do
            expect(page).to have_selector('.advanced-filters--filter', count: count)
          end
        end

        def expect_open
          modal.expect_open
          expect(page).to have_selector('.tab-show.selected', text: 'Filters')
        end

        def expect_closed
          modal.expect_closed
        end
      end
    end
  end
end
