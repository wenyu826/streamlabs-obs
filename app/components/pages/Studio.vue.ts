import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import StudioEditor from '../StudioEditor.vue';
import StudioControls from '../StudioControls.vue';

@Component({
  components: {
    StudioEditor
  }
})
export default class Studio extends Vue {
}
