const fs = require("fs-extra"),
  chalk = require("chalk"),
  fetch = require("node-fetch"),
  URL = require("url").URL,
  path = require("path"),
  { spawn } = require("child_process"),
  { promisify } = require("util"),
  shell = require("shelljs"),
  tsUtils = require("./ts-utils");

const rimraf = promisify(require("rimraf"));

const ionicNativePath = process.env.IONIC_NATIVE_PATH || "../../ionic-native";

function writeRow(row) {
  console.log(row.map((c) => `"${c}"`).join(","));
}

async function getPluginNames() {
  const pluginFile = await fs.promises.readFile("plugins.txt", {
    encoding: "utf-8",
  });
  return pluginFile.split("\n");
}

async function run() {
  const test = process.argv[2];
  if (!test) {
    console.error("No test supplied");
    process.exit(1);
  }

  const testFn = {
    activity: runActivityTest,
    install: runInstallTest,
  }[test];

  if (!testFn) {
    console.error(`No test named ${test}`);
    process.exit(1);
  }

  testFn();
}

async function runActivityTest() {
  const plugins = await getPluginNames();

  const header = [
    "Plugin",
    "Repo",
    "Plugin Package",
    "Last Commit Date",
    "Is Archived",
    "Open Issues",
    "Stars",
    "30 Day Downloads",
  ];

  writeRow(header);

  for (const p of plugins) {
    await auditPlugin(p);
  }
}

async function auditPlugin(plugin) {
  const pluginInfo = await tsUtils.loadPluginInfo(plugin, ionicNativePath);

  const repo = pluginInfo.repo;
  if (!repo) {
    return;
  }

  try {
    const u = new URL(repo);
    const p = u.pathname.split("/");
    const orgName = p[1];
    const repoName = p[2].replace(".git", "");
    let isArchived = false;
    let openIssuesCount = -1;
    let starCount = -1;
    let downloads30 = -1;

    const apiUrl = `https://api.github.com/repos/${orgName}/${repoName}`;

    var res = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });
    var json = await res.json();

    if (res.status != 200) {
      console.error(
        `Unable to fetch ${plugin} - ${repo}`,
        res.status,
        res.statusText,
        json
      );
      return;
    }

    isArchived = json.archived;
    starCount = json.stargazers_count;
    openIssuesCount = json.open_issues_count;

    // Get commits
    //console.log("Fetching repo info", apiUrl);
    const commitsApiUrl = `${apiUrl}/commits`;
    res = await fetch(commitsApiUrl, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });
    json = await res.json();

    if (res.status != 200) {
      console.error(
        `Unable to fetch ${plugin} - ${repo}`,
        res.status,
        res.statusText,
        json
      );
      return;
    }

    const lastCommit = json[0];

    try {
      var npmDownloads = `https://api.npmjs.org/downloads/point/last-month/${pluginInfo.plugin}`;
      const res = await fetch(npmDownloads);
      const npmJson = await res.json();
      downloads30 = npmJson.downloads;
    } catch (ex) {
      console.error("Unable to get download count on npm", ex);
    }

    const row = [
      plugin,
      repo,
      pluginInfo.plugin,
      lastCommit.commit.committer.date,
      isArchived,
      openIssuesCount,
      starCount,
      downloads30,
    ];

    writeRow(row);
  } catch (e) {
    console.error(`Unable to fetch plugin ${plugin} - ${repo}`, e);
  }

  // console.log("Got plugin info", pluginInfo);
}

async function runInstallTest(plugin) {
  const plugins = await getPluginNames();

  console.log(chalk`{blue.bold Running install test}`);

  /*
  console.log("Clearing tmp dir");
  await rimraf("tmp");
  await fs.promises.mkdir("tmp");
  console.log("Copying template");
  await fs.copySync("../plugin-project-template", "tmp/");
  */

  console.log("Installing dependencies");
  shell.cd("tmp");
  shell.exec("npm install");

  /*
  for (const plugin of plugins) {
    await installTest(plugin);
  }
  */
  await installTest(plugins[0]);

  shell.exec("npm run build");
  shell.exec("ionic capacitor sync");
  /*
  const npmi = spawn("npm", ["install"]);
  npmi.stdout.on("data", function (data) {
    console.log(data);
  });
  npmi.stderr.on("data", function (data) {
    console.error(chalk`{red.bold [error]} ${data}`);
  });
  npmi.on("close", async (code) => {
    if (!code) {
      for (const plugin of plugins) {
        await installTest(plugin);
      }
    }
  });
  */
}

async function installTest(plugin) {
  const pluginInfo = await tsUtils.loadPluginInfo(
    plugin,
    path.join("../", ionicNativePath)
  );
  console.log(plugin, ionicNativePath);

  const package = pluginInfo.plugin;
  console.log(chalk`{green.bold [install] {white ${package}}}`);
  shell.exec(`npm install ${package}`);
  shell.exec(`ionic capacitor update`);
}

(async function () {
  try {
    await run();
  } catch (e) {
    console.error("Unable to run test", e);
  }
})();
