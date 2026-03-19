{
  description = "scemas-platform: smart city environmental monitoring (SE 3A04)";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/master";

  outputs = {self, nixpkgs}: let
    systems = ["x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin"];
    forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
  in {
    devShells = forAllSystems (pkgs: let
      pg_init = pkgs.writeShellScriptBin "pg_init" ''
        if [ ! -d "$PGDATA" ]; then
          echo "initializing postgres in $PGDATA"
          ${pkgs.postgresql_16}/bin/initdb -D "$PGDATA" -U scemas
          echo "host all all 127.0.0.1/32 trust" >> "$PGDATA/pg_hba.conf"
          echo "host all all ::1/128 trust" >> "$PGDATA/pg_hba.conf"
          echo "unix_socket_directories = '$PGDATA'" >> "$PGDATA/postgresql.conf"
          echo "port = $PGPORT" >> "$PGDATA/postgresql.conf"
        else
          echo "postgres already initialized at $PGDATA"
        fi
      '';
      pg_start = pkgs.writeShellScriptBin "pg_start" ''
        if [ ! -d "$PGDATA" ]; then
          echo "run pg_init first"
          exit 1
        fi
        ${pkgs.postgresql_16}/bin/pg_ctl -D "$PGDATA" -l "$PGDATA/postgres.log" -o "-k $PGDATA" start
        ${pkgs.postgresql_16}/bin/createdb -h "$PGDATA" -p "$PGPORT" -U scemas scemas 2>/dev/null || true
      '';
      pg_stop = pkgs.writeShellScriptBin "pg_stop" ''
        ${pkgs.postgresql_16}/bin/pg_ctl -D "$PGDATA" stop
      '';
    in {
      default = pkgs.mkShell {
        buildInputs = with pkgs; [
          cargo clippy rustc rustfmt rust-analyzer
          bun nodejs_22
          postgresql_16 pg_init pg_start pg_stop
          pkg-config openssl
        ];
        env = {
          RUST_SRC_PATH = "${pkgs.rustPlatform.rustLibSrc}";
          PGDATA = "./.pgdata";
          PGPORT = "5432";
          PGHOST = "localhost";
          DATABASE_URL = "postgres://scemas:scemas@localhost:5432/scemas";
        };
        shellHook = ''
          source scripts/start-scemas.sh
        '';
      };
    });

    formatter = forAllSystems (pkgs: pkgs.alejandra);
  };
}
