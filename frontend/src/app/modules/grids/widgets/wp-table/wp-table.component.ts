import {Component, OnInit, OnDestroy, ViewChild, AfterViewInit} from "@angular/core";
import {ApiV3Filter, ApiV3FilterBuilder} from "core-components/api/api-v3/api-v3-filter-builder";
import {WidgetWpListComponent} from "core-app/modules/grids/widgets/wp-widget/wp-widget.component";
import {WorkPackageTableConfiguration} from "core-components/wp-table/wp-table-configuration";
import {QueryResource} from "core-app/modules/hal/resources/query-resource";
import {I18nService} from "core-app/modules/common/i18n/i18n.service";
import {untilComponentDestroyed} from 'ng2-rx-componentdestroyed';
import {WorkPackageIsolatedQuerySpaceDirective} from "core-app/modules/work_packages/query-space/wp-isolated-query-space.directive";
import {skip} from 'rxjs/operators';
import {UrlParamsHelperService} from "core-components/wp-query/url-params-helper";
import {QueryFormDmService} from "core-app/modules/hal/dm-services/query-form-dm.service";
import {QueryDmService} from "core-app/modules/hal/dm-services/query-dm.service";
import {QueryFormResource} from "core-app/modules/hal/resources/query-form-resource";

@Component({
  templateUrl: '../wp-widget/wp-widget.component.html',
  styleUrls: ['../wp-widget/wp-widget.component.css']
})
export class WidgetWpTableComponent extends WidgetWpListComponent implements OnInit, OnDestroy, AfterViewInit {
  public text = { title: this.i18n.t('js.grid.widgets.work_packages_table.title') };
  public queryId:string|null;
  private queryForm:QueryFormResource;

  public configuration:Partial<WorkPackageTableConfiguration> = {
    actionsColumnEnabled: false,
    columnMenuEnabled: true,
    hierarchyToggleEnabled: true,
    contextMenuEnabled: false
  };

  constructor(protected i18n:I18nService,
              protected urlParamsHelper:UrlParamsHelperService,
              private readonly queryDm:QueryDmService,
              private readonly queryFormDm:QueryFormDmService) {
    super(i18n);
  }

  @ViewChild(WorkPackageIsolatedQuerySpaceDirective) public querySpaceDirective:WorkPackageIsolatedQuerySpaceDirective;

  ngOnInit() {
    if (!this.resource.options.queryId) {
      this.createInitial()
        .then((query) => {
          this.resource.options = { queryId: query.id };

          this.resourceChanged.emit(this.resource);

          this.queryId = query.id;

          super.ngOnInit();
        });
    } else {
      this.queryId = this.resource.options.queryId as string;

      super.ngOnInit();
    }
  }

  ngAfterViewInit() {
    this
      .querySpaceDirective
      .querySpace
      .query
      .values$()
      .pipe(
        // 2 because ... well it is a magic number and works
        skip(2),
        untilComponentDestroyed(this)
      ).subscribe((query) => {
        if (this.queryForm) {
          this.queryDm.update(query, this.queryForm).toPromise();
        } else {
          this.queryFormDm.load(query).then((form) => {
            this.queryForm = form;
            this.queryDm.update(query, form).toPromise();
          });
        }
      });
  }

  ngOnDestroy() {
    // nothing to do
  }

  private createInitial():Promise<QueryResource> {
    return this.queryFormDm
      .loadWithParams(
        {pageSize: 0},
        undefined,
        null,
        this.buildQueryRequest()
      )
      .then(form => {
        const query = this.queryFormDm.buildQueryResource(form);
        return this.queryDm.create(query, form);
      });
  }

  private buildQueryRequest() {
    return {
      hidden: true
    };
  }
}
