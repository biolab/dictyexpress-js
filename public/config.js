// Value can be null or valid endpoint URL
// Default: domain/api
API_URL = null;
// Default: domain/saml-auth
SAML_AUTH_URL = null;
// Default: domain/ws
WEBSOCKET_URL = null;
// Fast-service route (same-origin via CloudFront), or null to use Resolwe process.
FIND_SIMILAR_API_URL = '/find-similar';
GO_ENRICHMENT_API_URL = '/go';
// Differential expression of selected single cells, or null to hide the feature.
CELL_DE_API_URL = '/cell-de';

// Default: bcm
COMMUNITY_SLUG = 'bcm';
// Default: first timeseries fetched from the backend
SELECTED_TIMESERIES_SLUG = null;
