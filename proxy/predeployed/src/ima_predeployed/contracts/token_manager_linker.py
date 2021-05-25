from ima_predeployed.addresses import MESSAGE_PROXY_FOR_SCHAIN_ADDRESS, TOKEN_MANAGER_ERC20_ADDRESS, \
    TOKEN_MANAGER_ERC721_ADDRESS, TOKEN_MANAGER_ETH_ADDRESS
from tools import w3
from ..contract_generator import ContractGenerator, next_slot


class TokenManagerLinkerGenerator(ContractGenerator):
    ARTIFACT_FILENAME = "TokenManagerLinker.json"
    DEFAULT_ADMIN_ROLE = (0).to_bytes(32, 'big')
    REGISTRAR_ROLE = w3.solidityKeccak(['string'], ['REGISTRAR_ROLE'])

    # ---------- storage ----------
    # --------Initializable--------
    # 0:    _initialized, _initializing;
    # -----ContextUpgradeable------
    # 1:    __gap
    # ...   __gap
    # 50:   __gap
    # --AccessControlUpgradeable---
    # 51:   _roles
    # 52:   __gap
    # ...   __gap
    # 100:  __gap
    # ------TokenManagerLinker------
    # 101:  messageProxy
    # 102:  tokenManagers

    ROLES_SLOT = 51
    MESSAGE_PROXY_SLOT = 101
    TOKEN_MANAGERS_SLOT = next_slot(MESSAGE_PROXY_SLOT)

    def __init__(self, deployer_address: str):
        super().__init__(self.ARTIFACT_FILENAME)
        self._setup(deployer_address)

    # private

    def _setup(self, deployer_address: str) -> None:
        self._setup_role(self.ROLES_SLOT, self.DEFAULT_ADMIN_ROLE, [deployer_address])
        self._setup_role(self.ROLES_SLOT, self.REGISTRAR_ROLE, [deployer_address])
        self._write_address(self.MESSAGE_PROXY_SLOT, MESSAGE_PROXY_FOR_SCHAIN_ADDRESS)
        self._write_addresses_array(
            self.TOKEN_MANAGERS_SLOT,
            [TOKEN_MANAGER_ETH_ADDRESS, TOKEN_MANAGER_ERC20_ADDRESS, TOKEN_MANAGER_ERC721_ADDRESS])