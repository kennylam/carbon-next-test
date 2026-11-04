import '@carbon/web-components/es/components/button/index.js';
import '@carbon/web-components/es/components/date-picker/index.js';
import '@carbon/web-components/es/components/dropdown/index.js';
import '@carbon/web-components/es/components/menu/index.js';
import '@carbon/web-components/es/components/notification/index.js';
import '@carbon/web-components/es/components/number-input/index.js';
import '@carbon/web-components/es/components/overflow-menu/index.js';
import '@carbon/web-components/es/components/page-header/index.js';
import '@carbon/web-components/es/components/side-panel/index.js';
import '@carbon/web-components/es/components/tag/index.js';
import '@carbon/web-components/es/components/text-input/index.js';
import '@carbon/web-components/es/components/tile/index.js';
import '@carbon/web-components/es/components/toggle/index.js';
import '@carbon/web-components/es/components/ui-shell/index.js';
import '@carbon/web-components/es/components/user-avatar/index.js';
import './index.scss';

const panel = document.getElementById('side-panel');
document.getElementById('open-panel')?.addEventListener('click', () => {
  panel?.setAttribute('open', '');
});
