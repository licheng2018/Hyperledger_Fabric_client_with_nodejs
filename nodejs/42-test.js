

var fs = require('fs');
var Fabric_Client = require('fabric-client');
var util = require('util'); 
var tx_id=null;
var client=new Fabric_Client();
const YAML = require('yamljs');
//var channel = client.newChannel('mychannel');
var data = YAML.parse(fs.readFileSync('../configuration/HyperledgerFabric.yaml').toString());
var CHANNEL_NAME=data.CHANNEL_NAME;
var USER_NAME=data.USER_NAME;
var MSPID=data.MSPID;
var PRIVATE_KEY=data.PRIVATE_KEY;
var SIGN_CERT=data.SIGN_CERT;
var PEER_ADDRESS=data.PEER_ADDRESS;
var PEER_ADDRESS_GRPC=data.PEER_ADDRESS_GRPC;
var PEER_SSL_TARGET=data.PEER_SSL_TARGET;
var ORDERER_SSL_TARGET=data.ORDERER_SSL_TARGET;
var ORDERER_ADDRESS=data.ORDERER_ADDRESS;
var CHAINCODE_ID=data.CHAINCODE_ID;
var CHANNEL_ID=data.CHANNEL_ID;
var LISTENING_ADDRESS=data.LISTENING_ADDRESS;
var channel = client.newChannel(CHANNEL_NAME);
var timestamp='key1';
var sensorvalue='380';
/*console.log(CHANNEL_NAME);
console.log(USER_NAME);
console.log(MSPID);
console.log(PRIVATE_KEY);
console.log(SIGN_CERT);
console.log(PEER_ADDRESS);
console.log(PEER_ADDRESS_GRPC_GRPC);
console.log(PEER_SSL_TARGET);
console.log(ORDERER_ADDRESS);
console.log(CHAINCODE_ID);
console.log(CHANNEL_ID);
console.log(LISTENING_ADDRESS);*/
//创建一个Client
Fabric_Client.newDefaultKeyValueStore({ path: '/tmp/xx/' }).then((state_store) => {
    //client=new Fabric_Client();
    client.setStateStore(state_store);


    //设置用户信息    
    var userOpt = {
        username:USER_NAME ,
        mspid: MSPID,
        cryptoContent: { 
            privateKey: PRIVATE_KEY,
            signedCert: SIGN_CERT
        }
    }

    return client.createUser(userOpt)

}).then((user)=>{

    //设置要连接的Channel
   
//var channel = client.newChannel('mychannel');
    //设置要连接的Peer
    var peer = client.newPeer(
        PEER_ADDRESS_GRPC,
        {
            pem: fs.readFileSync('./peer/tls/ca.crt', { encoding: 'utf8' }),
            clientKey: fs.readFileSync('./peer/tls/client.key', { encoding: 'utf8' }),
            clientCert: fs.readFileSync('./peer/tls/client.crt', { encoding: 'utf8' }),
            'ssl-target-name-override': PEER_ADDRESS
        }
    );

   channel.addPeer(peer);
   

	//设置要连接的orderer
	var ordererUserOpt={
	pem:fs.readFileSync('./orderer/tls/ca.crt', { encoding: 'utf8' }),
	'ssl-target-name-override':ORDERER_SSL_TARGET
	}
	orderer=client.newOrderer(ORDERER_ADDRESS,ordererUserOpt);
	channel.addOrderer(orderer);
	//targets.push(peer);
	

tx_id=client.newTransactionID();
console.log("Assigning transaction_id: ", tx_id._transaction_id); 
    //调用chaincode
    const request = {
        
		//targers:targets,
		chaincodeId: CHAINCODE_ID,   //chaincode名称
        fcn: 'write',          //调用的函数名
        args: [timestamp,sensorvalue],         //参数
		chainId:CHANNEL_NAME,
		txId:tx_id,
    };

    // send the query proposal to the peer
    return channel.sendTransactionProposal(request);


}).then((results)=>{
    var proposalResponses = results[0]; 
    var proposal = results[1]; 
    var header = results[2]; 
	
let isProposalGood = false; 
    if (proposalResponses && proposalResponses[0].response && 
        proposalResponses[0].response.status === 200) { 
        isProposalGood = true; 
        console.log('transaction proposal was good'); 
    } else { 
        console.error('transaction proposal was bad'); 
    } 
    if (isProposalGood) { 
       /* console.log(util.format( 
            'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s', 
            proposalResponses[0].response.status, proposalResponses[0].response.message, 
            proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));*/
	    console.log('Successfully sent Proposal and received ProposalResponse');
        var request = { 
            proposalResponses: proposalResponses, 
             proposal: proposal, 
            header: header 
        }; 
		
	}
	var transactionID = tx_id.getTransactionID(); 
        var eventPromises = []; 
        let eh = client.newEventHub(); 
	//var sendPromise = channel.sendTransaction(request); 
//var transactionID = tx_id.getTransactionID(); 
       // var eventPromises = []; 
        //let eh = client.newEventHub(); 
        //接下来设置EventHub，用于监听Transaction是否成功写入，这里也是启用了TLS 
        //let data = fs.readFileSync(options.peer_tls_cacerts); 
        let grpcOpts = { 
             pem: fs.readFileSync('./peer/tls/ca.crt', { encoding: 'utf8' }),
            'ssl-target-name-override': 'peer0.org1.example.com'
        } 
        eh.setPeerAddr('grpcs://0.0.0.0:7051',grpcOpts); 
        eh.connect();
		

        let txPromise = new Promise((resolve, reject) => { 
            let handle = setTimeout(() => { 
                eh.disconnect(); 
                reject(); 
            }, 30000); 
	
		 eh.registerTxEvent(transactionID, (tx, code) => { 
                clearTimeout(handle); 
                eh.unregisterTxEvent(transactionID); 
                eh.disconnect();

                if (code !== 'VALID') { 
                    console.error( 
                        'The transaction was invalid, code = ' + code); 
                    reject(); 
                 } else { 
                    console.log( 
                         'The transaction has been committed on peer ' + 
                         eh._ep._endpoint.addr); 
                    resolve(); 
                } 
            }); 
        }); 
		/*var sendPromise = channel.sendTransaction(request); */
		//var channel = client.addChannel('mychannel');
		// eventPromises.push(txPromise); 
        var sendPromise = channel.sendTransaction(request);
	console.log("finished");
		return 0;
       // return Promise.all([sendPromise].concat(eventPromises)).then((results) => { 
        //console.log(' event promise all complete and testing complete'); 
        //return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call 
		})

