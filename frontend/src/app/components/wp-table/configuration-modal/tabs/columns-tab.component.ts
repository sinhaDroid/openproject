import {AfterViewInit, Component, ElementRef, Injector, OnDestroy, ViewChild} from '@angular/core';
import {I18nService} from 'core-app/modules/common/i18n/i18n.service';
import {QueryColumn} from 'core-components/wp-query/query-column';
import {ConfigurationService} from 'core-app/modules/common/config/configuration.service';
import {WorkPackageTableColumnsService} from 'core-components/wp-fast-table/state/wp-table-columns.service';
import {TabComponent} from 'core-components/wp-table/configuration-modal/tab-portal-outlet';
import {BannersService} from "core-app/modules/common/enterprise/banners.service";

interface ColumnLike {
  text:string;
  id:string;
}

@Component({
  templateUrl: './columns-tab.component.html'
})
export class WpTableConfigurationColumnsTab implements TabComponent, AfterViewInit, OnDestroy {

  public availableColumns = this.wpTableColumns.all;
  public availableColumnsMap:{[id:string]: QueryColumn} = _.keyBy(this.availableColumns, c => c.id);
  public selectedColumns:ColumnLike[] = this.wpTableColumns.getColumns().map(c => this.column2Like(c));

  public selectedColumnMap:{ [id:string]:boolean } = {};
  public eeShowBanners:boolean = false;
  public text = {

    columnsHelp: this.I18n.t('js.work_packages.table_configuration.columns_help_text'),
    columnsLabel: this.I18n.t('js.label_columns'),
    selectedColumns: this.I18n.t('js.description_selected_columns'),
    multiSelectLabel: this.I18n.t('js.work_packages.label_column_multiselect'),

    upsaleRelationColumns: this.I18n.t('js.work_packages.table_configuration.upsale.relation_columns'),
    upsaleCheckOutLink: this.I18n.t('js.work_packages.table_configuration.upsale.check_out_link')
  };

  @ViewChild('select2Columns', { static: true }) select2Columns:ElementRef;

  constructor(readonly injector:Injector,
              readonly I18n:I18nService,
              readonly wpTableColumns:WorkPackageTableColumnsService,
              readonly ConfigurationService:ConfigurationService,
              readonly bannerService:BannersService) {
  }

  public onSave() {
    this.wpTableColumns.setColumnsById(this.selectedColumns.map(c => c.id));
  }

  public setSelectedColumn(column:ColumnLike) {
    if (this.selectedColumnMap[column.id]) {
      this.selectedColumns.push(column);
    }
    else {
      _.remove(this.selectedColumns, (c:ColumnLike) => c.id === column.id);
    }
  }

  public updateSelect2Columns(event:any) {
    const current:string[] = event.val;

    this.selectedColumnMap = {};
    this.selectedColumns = current.map(id => {
      this.selectedColumnMap[id] = true;
      return this.column2Like(this.availableColumnsMap[id]!)
    });
  }

  ngOnInit() {
    this.eeShowBanners = this.bannerService.eeShowBanners;
    this.selectedColumns.forEach((c:ColumnLike) => {
      this.selectedColumnMap[c.id] = true;
    });
  }

  ngAfterViewInit() {
    this.setupSelect2();
  }

  ngOnDestroy() {
    const input = jQuery(this.select2Columns.nativeElement);
    input.select2('close');
  }

  setupSelect2() {
    const input = jQuery(this.select2Columns.nativeElement);

    input
      .on('change', this.updateSelect2Columns.bind(this))
      .select2({
        multiple: true,
        tags: false,
        initSelection: (_:any, callback:(data:any) => any) => callback(this.selectedColumns),
        query: (query:any) => {
          let results:ColumnLike[] = [];

          this.availableColumns.forEach(c => {
            if (query.term.length === 0 || c.name.toUpperCase().indexOf(query.term.toUpperCase()) >= 0) {
              results.push({id: c.id, text: c.name });
            }
          });
          query.callback({ results: results, more: false });
        }
      })
      // Need to initialize with some empty value in order to hit initSelection
      .select2('val', []);

    // Make it sortable
    input
      .select2("container")
      .find("ul.select2-choices")
      .sortable({
        containment: 'parent',
        start: function() { input.select2("onSortStart"); },
        update: function() { input.select2("onSortEnd"); }
      });

    input
      .select2('focus')
  }

  private column2Like(c:QueryColumn):ColumnLike {
    return { id: c.id, text: c.name };
  }
}
