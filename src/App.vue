<template>
  <div class="w-screen h-screen p-16">
    <div class="w-full flex justify-center items-center">
      <div class="w-1/3 mx-2">
        <button
          class="p-10 w-full rounded-xl text-white bg-blue-800"
          @click="vote([1, 0, 0])">
          Candidate One
        </button>
        <p class="text-center">{{ cOne }}</p>
      </div>
      <div class="w-1/3 mx-2">
        <button
          class="p-10 w-full rounded-xl text-white bg-red-700"
          @click="vote([0, 1, 0])">
          Candidate Two
        </button>
        <p class="text-center">{{ cTwo }}</p>
      </div>
      <div class="w-1/3 mx-2">
        <button
          class="p-10 w-full rounded-xl text-white bg-green-700"
          @click="vote([0, 0, 1])">
          Candidate Three
        </button>
        <p class="text-center">{{ cThree }}</p>
      </div>
    </div>
    <div class="flex justify-center items-center">
      <button
        class="rounded-full bg-sky-500 text-white p-3 m-2"
        @click="listVotes">
        Show current votes
      </button>
      <button
        class="rounded-full bg-indigo-500 text-white p-3 m-2"
        @click="calculateVotes">
        Calculate votes
      </button>
    </div>

    <div class="text-center">
      <li v-for="ev in encryptedVotes" :key="ev">{{ ev.slice(-28) }}</li>
    </div>
  </div>
</template>

<script>
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useSealStore } from './stores/seal-store';

export default {
  name: 'App',

  setup() {
    // Initialize the SEAL
    const sealStore = useSealStore();
    const { seal } = storeToRefs(sealStore);
    const encryptedVotes = ref([]);
    const cOne = ref(0);
    const cTwo = ref(0);
    const cThree = ref(0);

    onMounted(async () => {
      // Wait a minute for the SEAL
      while (!!!seal.value) {
        console.log('SEAL is not initialized yet... please wait...', seal.value);
        // Wait 1s
        await new Promise((r) => setTimeout(r, 1000));
      }

      let key = localStorage.getItem('sk');

      if (!!!key) {
        let base64Sk = await sealStore.generateKey();
        localStorage.setItem('sk', base64Sk);
        return;
      }

      await sealStore.loadKey(key);
    });

    const calculateVotes = async () => {
      if (encryptedVotes.value.length == 0) await listVotes();
      let copiedVotes = JSON.parse(JSON.stringify(encryptedVotes.value));
      // let encryptedSum = '';
      // for (let i = 0; i < encryptedVotes.value.length; i++) {
      //   if (i == 0) {
      //     encryptedSum = encryptedVotes.value[i];
      //     continue;
      //   }
      //   encryptedSum = sealStore.add(encryptedVotes.value[i], encryptedSum);
      // }
      // console.log('cipher sum', encryptedSum);
      // let sum = await sealStore.decrypt(encryptedSum);
      // console.log('sum', sum);

      console.log('calculating...');
      let encryptedSum = copiedVotes.pop();
      encryptedSum = copiedVotes.reduce((prev, curr) => {
        return sealStore.add(prev, curr);
      }, encryptedSum);
      console.log('cipher sum', encryptedSum);
      let sum = await sealStore.decrypt(encryptedSum);
      console.log('sum', sum);
      cOne.value = sum[0];
      cTwo.value = sum[1];
      cThree.value = sum[2];
    };

    const listVotes = async () => {
      const res = await new Promise((resolve) => {
        encryptedVotes.value = [];
        for (let [key, val] of Object.entries(localStorage)) {
          if (key !== 'sk') {
            encryptedVotes.value.push(val);
          }
        }
        console.log('loaded!');
        resolve(encryptedVotes.value);
      });
      return res;
    };

    const vote = async (vote) => {
      const voteKey = Date.now();
      const cipherText = sealStore.encrypt(vote);

      localStorage.setItem(voteKey, cipherText);

      // const newCipherSumVote = evaluator.value.add(cipherText, cipherSumVote);

      // // Decrypt the cipherResult
      // const decryptedPlainText = decryptor.value.decrypt(newCipherSumVote);

      // // Decode the PlainText
      // const decodedArray = encoder.value.decode(decryptedPlainText);

      // console.log('decodedArray', decodedArray);
    };

    return {
      cOne,
      cTwo,
      cThree,
      encryptedVotes,
      calculateVotes,
      listVotes,
      vote,
    };
  },
};
</script>

<style>
.container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f2f3f5;
}

.candidates {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  margin: 10px 0;
}

.candidate {
  width: 20vw;
  height: 100px;
  margin: 0 5px;
  border-radius: 15px;
  border: none;
  color: white;
  cursor: pointer;
}
</style>
