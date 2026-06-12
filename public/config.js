// Value can be null or valid endpoint URL
// Default: domain/api
API_URL = null;
// Default: domain/saml-auth
SAML_AUTH_URL = null;
// Default: domain/ws. The Resolwe websocket backend lives on app.genialis.com
// (same as production); app.dictyexpress.org has no /ws route.
WEBSOCKET_URL = 'wss://app.genialis.com/ws/v2';
// Default: use Resolwe find-similar process.
// Set to the AWS API Gateway endpoint to use the fast precomputed-matrix service.
FIND_SIMILAR_API_URL = 'https://sl48nzcp1a.execute-api.us-east-1.amazonaws.com';
// Default: use Resolwe goenrichment process.
// Set to the AWS API Gateway endpoint to use the fast gotea GO-enrichment service.
GO_ENRICHMENT_API_URL = null;

// Default: bcm
COMMUNITY_SLUG = 'bcm';
// Default: first timeseries fetched from the backend
SELECTED_TIMESERIES_SLUG = 'ts_discoideum_parikh';
