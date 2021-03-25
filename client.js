/* 
IMPORTACION DE MODULOS, DEBEN ESTAR PREVIAMENTE INSTALADOS
 */
const { OPCUAClient, AttributeIds, TimestampsToReturn, ClientAlarm} = require("node-opcua");
const MongoClient = require('mongodb').MongoClient;
const {cyan, bgRed} = require("chalk");
const listen = require("socket.io");
const express = require("express");
const async = require("async");

/* 
CREACION DE CONSTANTES PARA LA COMUNICACION Y LA BASE DE DATOS
 */

//opc ua
const endpointUrl = "opc.tcp://" + require("os").hostname() + ":4334/UA/ImpresoraServer";
const nodeIdToMonitor = "ns=1;i=1055";
//aplicacion web
const port = 3700;

//mongo db
const uri = "mongodb+srv://lianju:Yuligb1996@cluster0.z4spe.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";
const clientmongo = new MongoClient(uri, {useNewUrlParser: true, useUnifiedTopology: true});

/* 
EL CODIGO PRINCIPAL VA EN LA FUNCION ASYNC
 */

(async () => {    //await
  try {
    // crear cliente opc ua
    const client = OPCUAClient.create();

    // avisar cuando se esta intentando reconectar
    client.on("backoff", (retry, delay) => {
      console.log("Intentando conectarse a ", endpointUrl,
      ": Intento =", retry,
      "próximo intento en ", delay / 1000, "segundos")
    });

    // mostrar la url cuando se logre conectar
    console.log(" Conectando a ", cyan(endpointUrl));
    await client.connect(endpointUrl);
    console.log(" Conectado a ", cyan(endpointUrl));

    // iniciar la sesion para interactuar con el servidor opc ua
    const session = await client.createSession();
    console.log("Sesion iniciada".yellow);

    // crear una sucripcion
    const subscription = await session.createSubscription2({
      requestedPublishingInterval: 200,   //intervalo de tiempo en el cual se publica la solicitud
      requestedMaxKeepAliveCount: 20,     //intentos maximos para recuperar la conexion
      publishingEnabled: true,            //habilitar la publicacion
    });

    /* 
    SE INICIA EL MONITOREO DE LA VARIABLE DEL SERVIDOR OPC UA
     */
    
    // crear el item con su nodeId y atributo
    const itemToMonitor = {
      nodeId: nodeIdToMonitor,
      AttributeIds: AttributeIds.Value
    };
    
    // definir los parametros de monitoreo
    const parameters = {
      samplingInterval: 50,   //tiempo de muestreo
      discardOldest: true,    //descartar datos anteriores
      queueSize: 100          //tamaño de la cola de datos
    };

    // crear el objeto de monitore 
    const monitoredItem = await subscription.monitor(itemToMonitor, parameters, TimestampsToReturn.Both);

    /* 
    CREAR LA APLICACION WEB
     */

    const app = express();
    app.set("view engine", "html");

    // definir el directorio de estaticos
    app.use(express.static(__dirname + '/'));
    app.set('Views', __dirname + '/');

    // definir como se responde cuando el navegador solicita entrar
    app.get("/", function(req,res){
      res.render('index.html');
    })

    /* 
    SE CREA UN OBJETO LISTEN PARA ENVIAR DATOS A LA APLICACION WEB
    IO.SOCKET --> "REAL-TIME BIDIRECTIONAL EVENT-BASED COMMUNICATION"
     */

    // asociar el puerto a la app web
    const io = listen(app.listen(port));

    // esperar la conexion
    io.sockets.on('connection', function(socket){
    });

    // mostrar el url para entrar a la aplicacion web
    console.log("visit http://localhost:" + port);

    /* 
    CONEXION A LA BASE DE DATOS
     */

    // conectar al cliente
    await clientmongo.connect();

    // conectarse a la coleccion con los datos del mongodb atlas
    const collection = clientmongo.db("VarImpresora3D").collection("Historial de datos");

    /* 
    DEFINIMOS QUE HACER CUANDO LA VARIABLE MONITOREADA CAMBIE
     */
    monitoredItem.on("changed", (dataValue) => {
      //escribir valor en mongo
      collection.insertOne({
        valor: dataValue.value.value, 
        time: dataValue.serverTimestamp
      });
      io.sockets.emit("message", {
        value: dataValue.value.value,
        timestamp: dataValue.serverTimestamp,
        nodeId: nodeIdToMonitor,
        browseName: "Nombre"
      });

    });


    /* 
    SALIR AL PRESIONAR CTRL + C
     */
    let running = true;
    process.on("SIGINT", async () => {
      if (!running){
        return;   // avoid calling shutdown twice
      }
      console.log("shutting down client");
      running = false;
      await clientmongo.close();
      await subscription.terminate();
      await session.close();
      await client.disconnect();
      console.log("Done");
      process.exit(0);
    });
  }
  catch(err){
    /* 
    CODIGO DE EJECUCION SI OCURRE UN ERROR EN EL BLOQUE TRY
     */
    console.log(bgRed.white("Error" + err.message));
    console.log(err);
    process.exit(-1);
  }
})();   //La funcion se estara ejecutando