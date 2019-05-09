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

require 'spec_helper'

describe 'Arbitrary WorkPackage query table widget on my page', type: :feature, js: true do
  let!(:type) { FactoryBot.create :type }
  let!(:other_type) { FactoryBot.create :type }
  let!(:priority) { FactoryBot.create :default_priority }
  let!(:project) { FactoryBot.create :project, types: [type] }
  let!(:other_project) { FactoryBot.create :project, types: [type] }
  let!(:open_status) { FactoryBot.create :default_status }
  let!(:type_work_package) do
    FactoryBot.create :work_package,
                      project: project,
                      type: type,
                      author: user,
                      responsible: user
  end
  let!(:other_type_work_package) do
    FactoryBot.create :work_package,
                      project: project,
                      type: other_type,
                      author: user,
                      responsible: user
  end

  let(:permissions) { %i[view_work_packages add_work_packages save_queries] }

  let(:user) do
    FactoryBot.create(:user,
                      member_in_project: project,
                      member_with_permissions: permissions)
  end
  let(:my_page) do
    Pages::My::Page.new
  end

  let(:modal) { ::Components::WorkPackages::TableConfigurationModal.new }
  let(:filters) { ::Components::WorkPackages::TableConfiguration::Filters.new }
  let(:columns) { ::Components::WorkPackages::Columns.new }

  before do
    login_as user

    my_page.visit!
  end

  context 'with the permission to save queries' do
    it 'can add the widget and see the work packages of the filtered for types' do
      my_page.add_column(3, before_or_after: :before)

      my_page.add_widget(2, 3, "Work packages")

      sleep(1)

      filter_area = Components::Grids::GridArea.new('.grid--area.-widgeted:nth-of-type(3)')
      created_area = Components::Grids::GridArea.new('.grid--area', text: "Work packages created by me")

      filter_area.expect_to_span(2, 3, 5, 4)
      filter_area.resize_to(6, 4)

      filter_area.expect_to_span(2, 3, 7, 5)
      ## enlarging the table area will have moved the created area down
      created_area.expect_to_span(7, 4, 13, 6)

      # At the beginning, the default query is displayed
      expect(filter_area.area)
        .to have_selector('.subject', text: type_work_package.subject)

      expect(filter_area.area)
        .to have_selector('.subject', text: other_type_work_package.subject)

      # User has the ability to modify the query

      modal.open_and_switch_to('Filters')
      filters.expect_filter_count(2)
      filters.add_filter_by('Type', 'is', type.name)
      modal.save

      columns.remove 'Subject'

      expect(filter_area.area)
        .to have_selector('.id', text: type_work_package.id)

      # as the Subject column is disabled
      expect(filter_area.area)
        .to have_no_selector('.subject', text: type_work_package.subject)

      # As other_type is filtered out
      expect(filter_area.area)
        .to have_no_selector('.id', text: other_type_work_package.id)

      scroll_to_element(filter_area.area)
      within filter_area.area do
        input = find('.editable-toolbar-title--input')
        input.set('My WP Filter')
        input.native.send_keys(:return)
      end

      sleep(1)

      # The whole of the configuration survives a reload
      # as it is persisted in the grid

      visit root_path
      my_page.visit!

      filter_area = Components::Grids::GridArea.new('.grid--area.-widgeted:nth-of-type(3)')
      expect(filter_area.area)
        .to have_selector('.id', text: type_work_package.id)

      # as the Subject column is disabled
      expect(filter_area.area)
        .to have_no_selector('.subject', text: type_work_package.subject)

      # As other_type is filtered out
      expect(filter_area.area)
        .to have_no_selector('.id', text: other_type_work_package.id)

      within filter_area.area do
        expect(find('.editable-toolbar-title--input').value)
          .to eql('My WP Filter')
      end
    end
  end

  context 'without the permission to save queries' do
    let(:permissions) { %i[view_work_packages add_work_packages] }

    it 'cannot add the widget' do
      my_page.add_column(3, before_or_after: :before)

      my_page.expect_unable_to_add_widget(2, 3, "Work packages")
    end
  end
end
