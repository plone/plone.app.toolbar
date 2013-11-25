{ }:

let
    pkgs = import <nixpkgs> { };
in

with pkgs;

buildEnv {
  name = "plone-app-widgets-env";
  paths = [
    python27
    python27Packages.recursivePthLoader
    python27Packages.virtualenv
    python27Packages.Plone
  ] ++ lib.attrValues python27.modules;
}
