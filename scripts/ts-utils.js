const path = require("path"),
  ts = require("typescript");

function loadPluginInfo(plugin, ionicNativePath) {
  const pluginDir = `${ionicNativePath}/src/@ionic-native/plugins/${plugin}`;
  const indexTs = path.join(pluginDir, "index.ts");
  console.log(indexTs);

  return new Promise((resolve, reject) => {
    const program = ts.createProgram([indexTs], {
      allowJs: true,
    });

    const node = program.getSourceFile(indexTs);

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

    resolve(info);
  });
}

module.exports = {
  loadPluginInfo,
};
