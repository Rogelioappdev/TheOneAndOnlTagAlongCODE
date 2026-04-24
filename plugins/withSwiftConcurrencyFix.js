const { withPodfile } = require('@expo/config-plugins');

module.exports = function withSwiftConcurrencyFix(config) {
  return withPodfile(config, (config) => {
    let contents = config.modResults.contents;

    const patchScript = `
    # Fix RCTDevMenuConfiguration missing in iOS 26 SDK
    header_path = File.join(installer.sandbox.root, 'Headers/Public/Expo/Expo/EXReactRootViewFactory.h')
    if File.exist?(header_path)
      content = File.read(header_path)
      unless content.include?('@class RCTDevMenuConfiguration;')
        content = content.gsub(
          '#if TARGET_OS_IOS || TARGET_OS_TV',
          "@class RCTDevMenuConfiguration;\n#if TARGET_OS_IOS || TARGET_OS_TV"
        )
        File.write(header_path, content)
      end
    end

    # Fix Swift 6 strict concurrency errors in pods
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['SWIFT_STRICT_CONCURRENCY'] = 'minimal'
      end
    end`;

    contents = contents.replace(
      /(\n  end\nend\s*$)/,
      patchScript + '$1'
    );

    config.modResults.contents = contents;
    return config;
  });
};
