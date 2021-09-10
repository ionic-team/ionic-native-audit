const fs = require("fs"),
  path = require("path"),
  ts = require("typescript"),
  fetch = require("node-fetch"),
  URL = require("url").URL,
  { Octokit } = require("@octokit/rest");

const octokit = new Octokit();

const ionicNativePath = process.env.IONIC_NATIVE_PATH || "../../ionic-native";

async function run() {
  const pluginFile = await fs.promises.readFile("plugins.txt", {
    encoding: "utf-8",
  });
  const plugins = pluginFile.split("\n");

  console.log(`"Plugin", "Repo", "Plugin Package", "Last Commit Date"`);
  for (const p of plugins) {
    await auditPlugin(p);
  }
  /*
  try {
    await Promise.all(plugins.map(auditPlugin));
  } catch (ex) {
    console.error("Unable to load plugin", ex);
  }
  */
}

async function auditPlugin(plugin) {
  // console.log(`Auditing @ionic-native/${plugin}`);

  const pluginDir = `${ionicNativePath}/src/@ionic-native/plugins/${plugin}`;
  const indexTs = path.join(pluginDir, "index.ts");

  const program = ts.createProgram([indexTs], {
    allowJs: true,
  });

  const srcFile = program.getSourceFile(indexTs);

  const pluginInfo = loadPluginInfo(srcFile);

  const repo = pluginInfo.repo;
  if (!repo) {
    return;
  }

  try {
    const u = new URL(repo);
    const p = u.pathname.split("/");
    const orgName = p[1];
    const repoName = p[2].replace(".git", "");

    const apiUrl = `https://api.github.com/repos/${orgName}/${repoName}/commits`;
    //console.log("Fetching repo info", apiUrl);
    const res = await fetch(apiUrl, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
      },
    });
    const json = await res.json();

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

    console.log(
      `"${plugin}", "${repo}", "${pluginInfo.plugin}", "${lastCommit.commit.committer.date}"`
    );
  } catch (e) {
    console.error(`Unable to fetch plugin ${plugin} - ${repo}`, e);
  }

  // console.log("Got plugin info", pluginInfo);
}

function loadPluginInfo(node) {
  var info = {};
  ts.forEachChild(node, (n) => {
    if (ts.isClassDeclaration(n)) {
      const decorators = n.decorators || [];
      const pluginDecorator = decorators.find(
        (d) => d.expression.expression.escapedText == "Plugin"
      );

      if (!pluginDecorator) {
        return;
      }
      const props = pluginDecorator.expression.arguments[0].properties;

      const mappedProps = props.reduce((v, p) => {
        v[p.name.escapedText] = p.initializer.text;
        return v;
      }, {});
      if (!mappedProps["repo"]) {
        return;
      }
      info = {
        name: n.name?.escapedText,
        ...mappedProps,
      };
    }
  });

  return info;
}

(async function () {
  await run();
})();
