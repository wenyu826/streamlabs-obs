import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { WidgetsService } from '../services/widgets';
import { Inject } from '../util/injector';
import { SourcesService } from 'services/sources';
import { SourceFiltersService } from 'services/source-filters';

@Component({})
export default class TestWidgets extends Vue {

  @Inject()
  widgetsService:WidgetsService;

  @Inject()
  sourcesService:SourcesService;

  @Inject()
  sourceFiltersService:SourceFiltersService;

  slideOpen = false;

  get widgetTesters() {
    return this.widgetsService.getTesters();
  }

  toggleFacemask() {
    const webcamSource1 = this.sourcesService.sources.find(source => {
      return source.type === 'dshow_input';
    });
    const filters = this.sourceFiltersService.getFilters(webcamSource1.sourceId);
    const targetFilter = filters.find(filter => {
      return filter.type === 'face_mask_filter';
    });
    this.sourceFiltersService.setVisibility(webcamSource1.sourceId, targetFilter.name, !targetFilter.visible);
  }

}
