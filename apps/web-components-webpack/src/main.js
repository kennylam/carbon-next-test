import '@carbon/web-components/es/components/button/index.js';
import '@carbon/web-components/es/components/modal/index.js';
import '@carbon/web-components/es/components/search/index.js';
import '@carbon/web-components/es/components/structured-list/index.js';
import '@carbon/web-components/es/components/tabs/index.js';
import '@carbon/web-components/es/components/tag/index.js';
import '@carbon/web-components/es/components/tile/index.js';
import '@carbon/web-components/es/components/toggle/index.js';
import './index.scss';

document.getElementById('open-modal').addEventListener('click', () => {
  document.getElementById('modal').setAttribute('open', '');
});
