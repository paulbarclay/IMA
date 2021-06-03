#!/usr/bin/env python
from ima_predeployed.generator import generate_contracts
import json
import sys


def main():
    if len(sys.argv) < 3:
        print("Usage:")
        print("./generate_genesis.py base_genesis.json config.json [target_key]")
        exit(1)
    base_genesis_filename = sys.argv[1]    
    config_filename = sys.argv[2]
    target_key = 'alloc'
    if len(sys.argv) > 3:
        target_key = sys.argv[-1]
    with open(base_genesis_filename) as base_genesis_file:
        with open(config_filename) as config_file:
            base_genesis = json.load(base_genesis_file)
            config = json.load(config_file)
            genesis = base_genesis
            genesis[target_key].update(generate_contracts(
                config['schain_owner'],
                config['schain_name'],
                {
                    'eth_deposit_box': config['eth_deposit_box'],
                    'erc20_deposit_box': config['erc20_deposit_box'],
                    'erc721_deposit_box': config['erc721_deposit_box'],
                    'erc1155_deposit_box': config['erc1155_deposit_box'],
                    'linker': config['linker'],
                    'community_pool': config['community_pool']
                }))
            print(json.dumps(genesis, indent=4, sort_keys=True))


if __name__ == '__main__':
    main()
