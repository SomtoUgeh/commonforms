import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'CommonForms Assistant',
  version: '0.1.0',
  description: 'Convert PDFs to fillable forms directly from your browser',
  action: {
    default_popup: 'index.html',
    default_title: 'CommonForms Assistant',
  },
  background: {
    service_worker: 'src/background.ts',
    type: 'module',
  },
  permissions: ['activeTab', 'downloads', 'storage', 'scripting', 'tabs'],
  host_permissions: ['<all_urls>'],
});
