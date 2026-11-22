// Starts an ephemeral MongoDB (downloaded binary, no install, no credentials)
// and runs the MONGODB_URI-gated integration test against it.
const { MongoMemoryServer } = require("mongodb-memory-server");
const { spawnSync } = require("child_process");

(async () => {
  const mms = await MongoMemoryServer.create();
  const uri = mms.getUri();
  console.log("ephemeral mongod at", uri);
  const result = spawnSync(
    "npx",
    ["vitest", "run", "tests/vitest/mongoIntegration.test.ts"],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        MONGODB_URI: uri,
        TOKEN_ENCRYPTION_KEY: "a".repeat(64),
      },
    },
  );
  await mms.stop();
  process.exit(result.status === null ? 1 : result.status);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
