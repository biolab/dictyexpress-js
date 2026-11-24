# DictyExpress frontend

The dictyExpress web client uses React, TypeScript and Vite.

## Install and run

Use Node.js 20 or later and the bundled Yarn 3.2.4. From the repository root:

```sh
node .yarn/releases/yarn-3.2.4.cjs install --immutable
node .yarn/releases/yarn-3.2.4.cjs start
```

Open the local URL printed by Vite. With the project Yarn available on your path, the same commands are `yarn install --immutable` and `yarn start`. The Vite configuration defines the development proxies. The cell-marker workflow requires the configured `/cell-de` service.

## GIT

To enable custom pre-push hook, update git configuration to let it know where our hook files lie:

```
git config core.hooksPath .githooks
```

## Available Scripts

In the project directory, you can run:

### `yarn start`

Starts the Vite development server with hot reload.

### `yarn lint`

Runs ESLint with Prettier check.

### `yarn lint:fix`

Runs ESLint with Prettier combined to apply automatic fixes.

### `yarn check`

Runs the TypeScript compiler and lint checks.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />

### `yarn e2e:debug`

Assuming locally running web site (using `yarn start` or `yarn serve`). On Windows git-bash is assumed.

```
# Headed with inspector
LOGIN_EMAIL=myuser@my.com LOGIN_PASSWORD=mysecret PWDEBUG=1 yarn e2e

# Headless
LOGIN_EMAIL=myuser@my.com LOGIN_PASSWORD=mysecret yarn e2e
```

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Update `/build/config.js` with appropriate endpoint URLs and your app is ready to be deployed.

To preview the build locally, run `yarn serve` and open the URL printed by Vite.
