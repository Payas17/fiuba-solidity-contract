pragma solidity ^0.8.0;

abstract contract CreditoToken {
    
    function name() external pure returns (string memory){
        return "FIUBA-TOKEN";
    }

    function symbol() external pure returns (string memory){
        return "FUC";
    }

    function decimals() external pure returns (uint8){
        return 0;
    }
    
    function balanceOf(address _owner) virtual external view returns (uint256 _balance);
}