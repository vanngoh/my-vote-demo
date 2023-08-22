import { defineStore } from 'pinia';
import { ref } from 'vue';
import SEAL from 'node-seal';

export const useSealStore = defineStore('seal', () => {
  const seal = ref(null);
  var context = null;
  const encoder = ref(null);
  const encryptor = ref(null);
  const decryptor = ref(null);
  const evaluator = ref(null);

  (async () => {
    seal.value = await SEAL();
    context = await initContext();
  })();

  const add = (base64CipherA, base64CipherB) => {
    // Parse the cipherA
    let cipherA = seal.value.CipherText();
    cipherA.load(context, JSON.parse(base64CipherA));

    // Parse the cipherB
    let cipherB = seal.value.CipherText();
    cipherB.load(context, JSON.parse(base64CipherB));

    // Prepare the result
    let cipherRes = seal.value.CipherText();

    // Start the operation
    evaluator.value.add(cipherA, cipherB, cipherRes);

    return JSON.stringify(cipherRes.save());
  };

  const decrypt = async (base64Cipher) => {
    let cipher = seal.value.CipherText();
    cipher.load(context, JSON.parse(base64Cipher));
    let plain = decryptor.value.decrypt(cipher);
    return encoder.value.decode(plain);
  };

  const encrypt = (list) => {
    const array = Uint32Array.from(list);
    const vote = encoder.value.encode(array);
    const encryptedVote = encryptor.value.encrypt(vote);

    return JSON.stringify(encryptedVote.save());
  };

  const generateKey = async () => {
    // Generate the keys
    let keyGenerator = seal.value.KeyGenerator(context);
    let publicKey = keyGenerator.createPublicKey();
    let secretKey = keyGenerator.secretKey();
    let base64Sk = JSON.stringify(secretKey.save());

    // Initialize the encryptor & decryptor
    encryptor.value = seal.value.Encryptor(context, publicKey);
    decryptor.value = seal.value.Decryptor(context, secretKey);

    return base64Sk;
  };

  const initContext = async () => {
    const schemeType = seal.value.SchemeType.bfv;
    const securityLevel = seal.value.SecurityLevel.tc128;
    const polyModulusDegree = 4096;
    const bitSizes = [36, 36, 37];
    const bitSize = 20;

    let params = seal.value.EncryptionParameters(schemeType);

    // Set the PolyModulusDegree
    params.setPolyModulusDegree(polyModulusDegree);

    // Create a suitable set of CoeffModulus primes
    params.setCoeffModulus(
      seal.value.CoeffModulus.Create(
        polyModulusDegree,
        Int32Array.from(bitSizes)
      )
    );

    // Set the PlainModulus to a prime of bitSize 20.
    params.setPlainModulus(
      seal.value.PlainModulus.Batching(polyModulusDegree, bitSize)
    );

    const context = seal.value.Context(
      params, // Encryption Parameters
      true, // ExpandModChain
      securityLevel // Enforce a security level
    );

    if (!context.parametersSet()) {
      throw new Error(
        'Could not set the parameters in the given context. Please try different encryption parameters.'
      );
    }

    console.log('initing encoder');
    // Init encoder and evaluator
    encoder.value = seal.value.BatchEncoder(context);
    evaluator.value = seal.value.Evaluator(context);
    console.log('inited encoder');

    return context;
  };

  const loadKey = async (base64Sk) => {
    // Load the secret key
    let secretKey = seal.value.SecretKey();
    secretKey.load(context, JSON.parse(base64Sk));

    // Generate the public key with the secret key
    let keyGenerator = seal.value.KeyGenerator(context, secretKey);
    let publicKey = keyGenerator.createPublicKey();

    // Initialize the encryptor & decryptor
    encryptor.value = seal.value.Encryptor(context, publicKey);
    decryptor.value = seal.value.Decryptor(context, secretKey);

    return;
  };

  // // from https://developers.google.com/web/updates/2012/06/How-to-convert-ArrayBuffer-to-and-from-String
  // const str2ab = (str) => {
  //   const buf = new ArrayBuffer(str.length);
  //   const bufView = new Uint8Array(buf);
  //   for (let i = 0, strLen = str.length; i < strLen; i++) {
  //     bufView[i] = str.charCodeAt(i);
  //   }
  //   return buf;
  // };

  return {
    seal,
    add,
    decrypt,
    encrypt,
    generateKey,
    initContext,
    loadKey,
  };
});
