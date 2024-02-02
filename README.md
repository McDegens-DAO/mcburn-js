# mcburn-js
A javascript example calling the mcburn cNFT burner program.

This repo is derived from working code however this repo itself has not been tested.

ATTN - this is not ready yet!
You can find the OSS Rust repo here: 

When running mcburnjs()

If there are > 23 proofs required, a tx to create a helper ALT is required before the burn. Since ALTs cost SOL, you should save the helper ALT's address so that you can deactivate it and then close it to recover funds. 

In the console logs you will see this output: 

"SAVE THIS ALT ADDRESS TO DEACTIVATE AND CLOSE LATER TO RECOUP FUNDS!"

followed by the Helper ALT's address you need to save.

Please note there are some timing events that have to be considered.

You can not deactivate an ALT imediately after burning. And you can not close an ALT imediately after deactivating it. 

Timing required may be by slots passed or blockhash expiration.

Currently we're just waiting 5 minutes after the burn to deactivate, and then another 5 min before closing.

We will run more test to narrow this timing down.
