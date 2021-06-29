var CursosFactory = artifacts.require("CursosFactory");

module.exports = function(deployer) {
  deployer.deploy(CursosFactory);
};