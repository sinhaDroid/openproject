// -- copyright
// OpenProject is a project management system.
// Copyright (C) 2012-2015 the OpenProject Foundation (OPF)
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License version 3.
//
// OpenProject is a fork of ChiliProject, which is a fork of Redmine. The copyright follows:
// Copyright (C) 2006-2013 Jean-Philippe Lang
// Copyright (C) 2010-2013 the ChiliProject Team
//
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License
// as published by the Free Software Foundation; either version 2
// of the License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
//
// See doc/COPYRIGHT.rdoc for more details.
// ++

import {Injectable} from "@angular/core";
import {HttpClient} from '@angular/common/http';
import {WorkPackageNotificationService} from "core-app/components/wp-edit/wp-notification.service";

@Injectable()
export class CostBudgetSubformAugmentService {

  constructor(private wpNotifications:WorkPackageNotificationService,
              private http:HttpClient) {
  }

  listen() {
    jQuery('costs-budget-subform').each((i, match) => {
      let el = jQuery(match);

      const container = el.find('.budget-item-container');
      const templateEl = el.find('.budget-row-template');
      templateEl.detach();
      const template = templateEl[0].outerHTML;
      let rowIndex = parseInt(el.attr('item-count') as string);

      // Refresh row on changes
      el.on('change', '.budget-item-value', (evt) => {
        let row = jQuery(evt.target).closest('.cost_entry');
        this.refreshRow(el, row.attr('id') as string);
      });

      el.on('click', '.delete-budget-item', (evt) => {
        evt.preventDefault();
        jQuery(evt.target).closest('.cost_entry').remove();
        return false;
      });

      // Add new row handler
      el.find('.budget-add-row').click((evt) => {
        evt.preventDefault();
        let row = jQuery(template.replace(/INDEX/g, rowIndex.toString()));
        row.show();
        row.removeClass('budget-row-template');
        container.append(row);
        rowIndex += 1;
        return false;
      });
    });
  }

  /**
   * Refreshes the given row after updating values
   */
  public refreshRow(el:JQuery, row_identifier:string) {
    let row = el.find('#' + row_identifier);
    let request = this.buildRefreshRequest(row, row_identifier);

    this.http
      .post(el.attr('update-url')!, request, { headers: { 'Accept': 'application/json' } })
      .subscribe(
        (data:any) => {
          _.each(data, (val:string, selector:string) => {
            jQuery('#' + selector).html(val);
          });
        },
        (error:any) => this.wpNotifications.handleRawError(error)
      );
  }

  /**
   * Returns the params for the update request
   */
  private buildRefreshRequest(row:JQuery, row_identifier:string) {
    let request:any = {
      element_id: row_identifier,
      fixed_date: row.find('#cost_object_fixed_date').val()
    };

    // Augment common values with specific values for this type
    row.find('.budget-item-value').each((_i:number, el:any) => {
      let field = jQuery(el);
      request[field.data('requestKey')] = field.val() || '0';
    });

    return request;
  }
}
