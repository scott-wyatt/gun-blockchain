const Gun = require('gun')
require('gun/lib/path')
const gun = new Gun()
const Merklie = require('merklie')

class Block {
  constructor(hash, transactions, root, proof) {
    this.hash = hash
    this.transactions = transactions
    this.root = root
    this.proof = proof
  }
}

class BlockChain  {
  constructor(gun, config) {
    config = config || {}

    this.gun = gun
    this.merkle = new Merklie(config.merklie || {})
    this.gunChain = gun.get(config.chain_namespace || 'chain')
    this.gunTransactions = gun.get(config.transaction_namespace || 'transactions')

    this.init()
    this.createGenesisBlock()
  }

  init() {
    const self = this
    this.gunChain.path('blocks').map().on((block) => {
      console.log('Subscribed to Block', block)
      // TODO load proof and validate it
    })
  }

  createGenesisBlock() {
    const data = { genesis: 'block' }
    return this.addBlock(data)
  }

  addBlock(data) {
    const hash = this.addLeaf(data)
    const root = this.getRootHash()
    const proof = this.getProof(hash)

    console.log('Adding Block', root, hash, proof)

    // Add this Block
    const block = new Block(hash, data, root, proof)

    // Add this to the gun chain
    this.gunChain.put({root: root})
    // this.gun.get(`block/${block.hash}`)
    this.gunChain.path('blocks').set(block)

    return block
  }

  /**
   * Alias of merklie.makeTree
   * @returns {*}
   */
  makeTree() {
    return this.merkle.makeTree()
  }

  /**
   * Alias of merklie.getMerkleRoot
   * @returns {*}
   */
  getRootHash() {
    return this.merkle.getMerkleRoot()
  }

  /**
   * Alias of merklie.getProof
   * @param index
   * @returns {*}
   */
  getProof(index) {
    return this.merkle.getProof(index)
  }

  /**
   * Alias of merklie.getLeaf
   * @param index
   */
  getLeaf(index) {
    return this.merkle.getLeaf(index)
  }

  /**
   * Special Alias of merklie.addLeaf
   * @param data
   * @returns {*}
   */
  addLeaf(data) {
    const leaf = this.merkle.addLeaf(data, true, true)
    this.makeTree()
    return leaf
  }

  /**
   * Validate a Block on the Entire Chain
   * @param block
   * @returns {*}
   */
  validateBlock(block) {
    const proof = this.getProof(block.hash)
    return this.merkle.validateProof(proof, block.hash, this.getRootHash())
  }

  /**
   * Validate a Block given the hashed root, it's proof, and block hash
   * @param block
   * @returns {*}
   */
  selfValidateBlock(block) {
    return this.merkle.validateProof(block.proof, block.hash, block.root)
  }
}

const blockChain = new BlockChain(gun, {})

const newBlock = blockChain.addBlock({hello1: 'Hello World'})
console.log('Block 1 IS VALID:', blockChain.validateBlock(newBlock))
console.log('Block 1 IS VALID TO ITSELF:', blockChain.selfValidateBlock(newBlock))

const newBlock2 = blockChain.addBlock({hello2: 'Hello World 2'})
console.log('Block 1 IS VALID ON MASTER CHAIN:', blockChain.validateBlock(newBlock))
console.log('Block 2 IS VALID:', blockChain.validateBlock(newBlock2))

