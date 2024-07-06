import fs from "fs";
console.log("initializing install...");
fs.readFile('config.js', 'utf8', function (err, data) {
if(err){
    console.log("first time install");
    console.log("creating default config...");
    fs.copyFile("config-default.js", "config.js", (err) => {
        if(err){
            console.log("failed to create default config");
        }
        else{
            console.log("default config created");
            fs.rename("config-default.js", "mcburn-js/config-default.js", function (err_b) {
                if(err_b){
                    console.log("failed to move config-default.js to mcburn-js");
                }
                else{
                    console.log("config-default.js moved to mcburn-js");
                }
            });
            fs.rename("updater.js", "mcburn-js/updater.js", function (err_c) {
                if(err_c){
                    console.log("failed to move updater.js to mcburn-js");
                }
                else{
                    console.log("updater.js moved to mcburn-js");
                    console.log("mcburn installed!");
                    console.log("open config.js and add your settings");
                }
            });
        }
    });
}
else{
    console.log("previous install detected");
    console.log("cleaning up!");
    fs.rename("config-default.js", "mcburn-js/config-default.js", function (err_d) {
        if(err_d){
            console.log("failed to move config-default.js to mcburn-js");
        }
        else{
            console.log("config-default.js moved to mcburn-js");
        }
    });
    fs.rename("updater.js", "mcburn-js/updater.js", function (err_e) {
        if(err_e){
            console.log("failed to move updater.js to mcburn-js");
        }
        else{
            console.log("updater.js moved to mcburn-js");
            console.log("mcburn updated!");
        }
    });
}
});
