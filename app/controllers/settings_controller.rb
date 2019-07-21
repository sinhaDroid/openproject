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

class SettingsController < ApplicationController
  layout 'admin'

  before_action :require_admin

  current_menu_item [:index, :edit] do
    :settings
  end

  current_menu_item :plugin do |controller|
    plugin = Redmine::Plugin.find(controller.params[:id])
    plugin.settings[:menu_item] || :settings
  rescue Redmine::PluginNotFound
    :settings
  end

  def index
    edit
    render action: 'edit'
  end

  def edit
    @notifiables = Redmine::Notifiable.all
    if request.post? && params[:settings]
      Settings::UpdateService
        .new(user: current_user)
        .call(settings: permitted_params.settings.to_h)

      flash[:notice] = l(:notice_successful_update)
      redirect_to action: 'edit', tab: params[:tab]
    else
      @options = {}
      @options[:user_format] = User::USER_FORMATS_STRUCTURE.keys.map { |f| [User.current.name(f), f.to_s] }
      @deliveries = ActionMailer::Base.perform_deliveries

      @guessed_host = request.host_with_port.dup

      @custom_style = CustomStyle.current || CustomStyle.new
    end
  end

  def plugin
    @plugin = Redmine::Plugin.find(params[:id])
    if request.post?
      Setting["plugin_#{@plugin.id}"] = params[:settings].permit!.to_h
      flash[:notice] = l(:notice_successful_update)
      redirect_to action: 'plugin', id: @plugin.id
    else
      @partial = @plugin.settings[:partial]
      @settings = Setting["plugin_#{@plugin.id}"]
    end
  rescue Redmine::PluginNotFound
    render_404
  end

  def default_breadcrumb
    l(:label_system_settings)
  end

  def show_local_breadcrumb
    true
  end
end
