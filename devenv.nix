{
  inputs,
  pkgs,
  ...
}: let
  pkgs-unstable = import inputs.nixpkgs-unstable {system = pkgs.stdenv.system;};
  browsers = (builtins.fromJSON (builtins.readFile "${pkgs-unstable.playwright-driver}/browsers.json")).browsers;
  chromium-rev = (builtins.head (builtins.filter (x: x.name == "chromium") browsers)).revision;
in {
  name = "use-next-ship-dev";

  claude.code.enable = true;

  env.GREET = "##### welcome to the use-next-ship development shell! #####";
  env = {
    PLAYWRIGHT_BROWSERS_PATH = "${pkgs-unstable.playwright.browsers}";
    PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = true;
    PLAYWRIGHT_NODEJS_PATH = "${pkgs.nodejs_22}/bin/node";
    PLAYWRIGHT_LAUNCH_OPTIONS_EXECUTABLE_PATH = "${pkgs-unstable.playwright.browsers}/chromium-${chromium-rev}/chrome-linux/chrome";
  };

  scripts.playwright-mcp-wrapped.exec = ''
    mcp-server-playwright --executable-path=$PLAYWRIGHT_LAUNCH_OPTIONS_EXECUTABLE_PATH
  '';

  packages = [
    pkgs.kubectl
    pkgs.aws-vault
    pkgs.kubernetes-helm
    pkgs.sops
    pkgs-unstable.playwright
    pkgs-unstable.playwright-test
    pkgs-unstable.playwright-mcp
  ];

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    pnpm.enable = true;
    pnpm.package = pkgs.pnpm;
    pnpm.install.enable = true;
  };
  languages.typescript.enable = true;
  dotenv.disableHint = true;

  services.postgres = {
    enable = true;
    initialScript = "CREATE USER dev WITH SUPERUSER PASSWORD 'devadminpassword';";
    initialDatabases = [{name = "devdb";}];
    listen_addresses = "localhost";
  };

  services.redis = {
    enable = true;
    extraConfig = ''
      requirepass devredispassword
      appendonly no
      save ""
    '';
  };

  processes.frontend = {
    exec = "pnpm dev -p 3000";
    process-compose = {
      readiness_probe = {
        http_get = {
          host = "localhost";
          port = 3000;
          path = "/healthz";
        };
        initial_delay_seconds = 2;
        period_seconds = 10;
        timeout_seconds = 4;
        success_threshold = 1;
        failure_threshold = 3;
      };
      availability.restart = "on_failure";
    };
  };

  enterShell = ''
    echo $GREET
  '';
}
