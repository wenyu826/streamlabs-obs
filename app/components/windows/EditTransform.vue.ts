import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import ModalLayout from 'components/ModalLayout.vue';
import windowMixin from 'components/mixins/window';

@Component({
  components: { ModalLayout },
  mixins: [windowMixin]
})
export default class EditTransform extends Vue {

  doneHandler() {

  }

}
