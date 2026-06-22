// Value can be null or valid endpoint URL
// Default: domain/api
API_URL = null;
// Default: domain/saml-auth
SAML_AUTH_URL = null;
// Default: domain/ws
WEBSOCKET_URL = null;
// Default: use Resolwe find-similar process. Set to the fast precomputed-matrix
// service's route (same-origin via CloudFront), or null to disable.
FIND_SIMILAR_API_URL = '/find-similar';
// Default: use Resolwe goenrichment process. Set to the fast gotea GO-enrichment
// service's route (same-origin via CloudFront), or null to disable.
GO_ENRICHMENT_API_URL = '/go';

// Default: bcm
COMMUNITY_SLUG = 'bcm';
// Default: first timeseries fetched from the backend
SELECTED_TIMESERIES_SLUG = null;
