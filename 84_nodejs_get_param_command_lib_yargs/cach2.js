module.exports.exec = async function () {
    console.log('Waiting some time to run .......');

    const cmdArgs = getCmdArgs();
    let roomValue = cmdArgs['--room'];
    let emailValue = cmdArgs['--email'];

    console.log(roomValue, emailValue, cmdArgs)

    console.log('Transfer admin done');
    process.exit(1);
};

function getCmdArgs() {
    const argvs = process.argv.slice(2);
    let result = [];
    argvs.forEach(function (argv) {
        let arr = argv.split('=');
        if (arr.length === 2) {
            result[arr[0]] = arr[1];
        }
    });
    return result;
}

this.exec();
