const { OPCUAClient, AttributeIds, resolveNodeId, TimestampsToReturn} = require("node-opcua");
const async = require("async");
const MongoClient = require('mongodb').MongoClient;


// const endpointUrl = "opc.tcp://<hostname>:4334/UA/MyLittleServer";
const endpointUrl = "opc.tcp://" + require("os").hostname() + ":4334/UA/ImpresoraServer";
const client = OPCUAClient.create({
    endpoint_must_exist: false
});

client.on("backoff", (retry, delay) =>
  console.log(
    "Intentando conectarse a ",
    endpointUrl,
    ": Intento =",
    retry,
    "próximo intento en ",
    delay / 1000,
    "seconds"
  )
);

let the_session, the_subscription;

//Conexion Mongodb

//url de conexion
const url = "mongodb+srv://lianju:Yuligb1996@cluster0.z4spe.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
//Nombre de la base de datos
const dbName = "VarImpresora3D";
//Nombre de la coleccion
const dbcollec = "Historial de datos";

MongoClient.connect(url,function(err, client){
     collection = client.db(dbName).collection(dbcollec);
});

async.series([

    // step 1 : connect to
    function(callback)  {
        client.connect(endpointUrl, function(err) {
          if (err) {
            console.log(" no se pudo conectar a el endpoint :", endpointUrl);
          } else {
            console.log("conectado!");
          }
          callback(err);
        });
    },

    // step 2 : createSession
    function(callback) {
        client.createSession(function(err, session) {
          if (err) {
            return callback(err);
          }
          the_session = session;
          callback();
        });
    },

    // step 3 : browse
    function(callback) {
       the_session.browse("RootFolder", function(err, browseResult) {
         if (!err) {
           console.log("Buscando rootfolder: ");
           for (let reference of browseResult.references) {
             console.log(reference.browseName.toString(), reference.nodeId.toString());
           }
         }
         callback(err);
       });
    },

    // step 4 : read a variable with readVariableValue
    function(callback) {
       the_session.read({nodeId: "ns=1;i=1055", attributeId: AttributeIds.Value}, (err, dataValue) => {
         if (!err) {
           console.log(" PosIndirect x = ", dataValue.toString());
         }
         callback(err);
       });
    },

    // step 4' : read a variable with read
    function(callback) {
       const maxAge = 0;
       const nodeToRead = {
         nodeId: "ns=1;i=1055",
         attributeId: AttributeIds.Value
       };
       
       the_session.read(nodeToRead, maxAge, function(err, dataValue) {
         if (!err) {
           console.log(" PosIndirect x = ", dataValue.toString());
         }
         callback(err);
       });
    },

    // step 5: install a subscription and install a monitored item for 10 seconds
    function(callback) {
       const subscriptionOptions = {
         maxNotificationsPerPublish: 1000,
         publishingEnabled: true,
         requestedLifetimeCount: 100,
         requestedMaxKeepAliveCount: 10,    //Intentos maximos de conexion
         requestedPublishingInterval: 1000
       };
       the_session.createSubscription2(subscriptionOptions, (err, subscription) => {
         if (err) {
           return callback(err);
         }
       
         the_subscription = subscription;
       
         the_subscription
           .on("started", () => {
             console.log(
               "subscription started for 2 seconds - subscriptionId=",
               the_subscription.subscriptionId
             );
           })
           .on("keepalive", function() {
             console.log("subscription keepalive");
           })
           .on("terminated", function() {
             console.log("terminated");
           });
         callback();
       });
    },
    function(callback) {
       // install monitored item
       const itemToMonitor = {
         nodeId: resolveNodeId("ns=1;i=1055"),
         attributeId: AttributeIds.Value
       };
       const monitoringParamaters = {
         samplingInterval: 100,   //intervalo de muestreo
         discardOldest: true,     //Descartar datos anteriores (no historicos)
         queueSize: 10            //tamaño de la cola de datos
       };
       
       the_subscription.monitor(
         itemToMonitor,
         monitoringParamaters,
         TimestampsToReturn.Both,
         (err, monitoredItem) => {
           monitoredItem.on("changed", function(dataValue) {
             console.log(
               "monitored item changed:  % PosIndirect X = ",
               dataValue.value.value
             );
             collection.insertOne({ 
                  valor: dataValue.value.value, 
                  time: dataValue.serverTimestamp})
           });
           callback();
         }
       );
       console.log("-------------------------------------");
    },
    function(callback) {
        // wait a little bit : 10 seconds
        setTimeout(()=>callback(), 10*1000);
    },
    // terminate session
    function(callback) {
        the_subscription.terminate(callback);;
    },
    // close session
    function(callback) {
        the_session.close(function(err) {
          if (err) {
            console.log("closing session failed ?");
          }
          callback();
        });
    }

],
function(err) {
    if (err) {
        console.log(" failure ",err);
    } else {
        console.log("done!");
    }
    client.disconnect(function(){});
}) ;