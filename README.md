Create application directory:

`mkdir npm_api`
`cd npm_api`

Initialize git repository:

`git init`

Initialize npm application:

`npm init`

Accept all proposed default values here. `package.json` is created.

I'm going to use [Mocha](https://mochajs.org/) framework for testing. So let's install it:

`npm install --save-dev mocha`

Now lets create empty test folder:

`mkdir test`

And configure test script in `package.json`:

```
"scripts": {
  "test": "node_modules/.bin/mocha"
}
```

Let's test result:

`npm test`

You should see something like `No test files found` in output.


