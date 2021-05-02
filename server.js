// IMPORTACION DE LIBRERIAS

const { OPCUAServer, Variant, DataType, nodesets,StatusCodes } = require("node-opcua");
const chalk = require("chalk");
const {spawn} = require('child_process');
const SerialPort = require('serialport');
const { Namespace } = require("socket.io");
// const raspi = require('raspi');
// const I2C = require('raspi-i2c').I2C;

// VARIABLES Globales

PosX = '';
PosY = '';
PosZ = '';
strdata = '';

// CONFIGURACION DE USUARIOS
const userManager = {
    isValidUser: function(userName, password) {
  
      if (userName === "julian" && password === "1234") {
        return true;
      }
      if (userName === "user2" && password === "password2") {
        return true;
      }
      return false;
    }
};

// CODIGO ASINCRONO SERVIDOR

(async () => {
    
    //CONFIGURACION DEL SERVIDOR

    const server = new OPCUAServer({
        nodeset_filename: [

            nodesets.standard,
            nodesets.cnc,
        ],
        serverInfo: {
            applicationName: { text: "Servidor ImpresoraFDM", locale: "es" },
        },
        userManager: userManager,
        port: 4334, // the port of the listening socket of the server
        resourcePath: "/UA/ImpresoraServer", // this path will be added to the endpoint resource name
        buildInfo : {
            productName: "ServidorImpresorasFDM",
            buildNumber: "7658",
            buildDate: new Date(2021,1,16)
        }
    });

    // CONSTRUCCION DEL ESPACIO DE DIRECCIONES DEL SERVIDOR

    await server.initialize();
    const addressSpace = server.engine.addressSpace;    // generar addressSpace inicial
    const nsCnc = addressSpace.getNamespaceIndex("http://opcfoundation.org/UA/CNC"); // NS DEL TYPE CNC(URI)
    const namespace = addressSpace.getOwnNamespace();   // Crear nuestro namespace(NS)

    // buscar objectTypes para instanciarlos posteriormente
    const CncInterfaceType = addressSpace.findObjectType("CncInterfaceType",nsCnc);
    const CncAxisType = addressSpace.findObjectType("CncAxisType",nsCnc);

    //ESPACIO PARA INSTANCIAR, CREAR Y MAPEAR (OBJETOS, VARIABLES, METODOS)
    
    // Crear objetos
    const impresora = namespace.addObject({
        organizedBy: addressSpace.rootFolder.objects,
        browseName: "AAS Impresora"
    });

    const activo = namespace.addObject({
        componentOf: impresora,
        browseName: "Activo"
    });

    const documentacion = namespace.addObject({
        componentOf: impresora,
        browseName: "Documentacion"
    });

    const identificacion = namespace.addObject({
        componentOf: impresora,
        browseName: "Identificacion"
    });

    
    // instanciar objectTypes
    const opc40502 = CncInterfaceType.instantiate({
        browseName: "OPC 40502",
        componentOf: impresora,
    });

    const CncAxisList = addressSpace.findNode("ns=1;i=1005"); // nodo de nivel inferior de CncInterface
    const CncAxisExtrusor = CncAxisType.instantiate({
        browseName: "Eje Extrusor",
        componentOf: CncAxisList,
    });

    const CncAxisX = CncAxisType.instantiate({
        browseName: "Eje X",
        componentOf: CncAxisList,
    });

    const CncAxisY = CncAxisType.instantiate({
        browseName: "Eje Y",
        componentOf: CncAxisList,
    });

    const CncAxisZ = CncAxisType.instantiate({
        browseName: "Eje Z",
        componentOf: CncAxisList,
    });


    // buscar nodos a mapear
    const IsRotational = addressSpace.findNode("ns=1;i=1014");
    const ActPosX = addressSpace.findNode("ns=1;i=1056");
    const ActPosY = addressSpace.findNode("ns=1;i=1090");
    const ActPosZ = addressSpace.findNode("ns=1;i=1124");

    // mapear variables
    IsRotational.setValueFromSource({ dataType: "Boolean", value: true});

    setInterval(() => {
        ActPosX.setValueFromSource({dataType: "Double", value: PosX})
        ActPosY.setValueFromSource({dataType: "Double", value: PosY})
        ActPosZ.setValueFromSource({dataType: "Double", value: PosZ})
    }, 500);

    //Crear metodos
    
    const method = namespace.addMethod(opc40502,{

        browseName: "Write Serial",
        
        inputArguments:  [
            {
                name:"Gcode, Mcode",
                description: { text: "Escribir codigo a enviar" },
                dataType: DataType.String
            }
         ],
         
         outputArguments: [{
             name:"Confirmacion",
             description:{ text: "Confirmar envio" },
             dataType: DataType.String ,
        }]
    });

    
    method.bindMethod((inputArguments,context,callback) => {
        
        const inCode =  inputArguments[0].value;
        mySerial.write(inCode);
    
        const callMethodResult = {
            statusCode: StatusCodes.Good,
            outputArguments: [{
                    dataType: DataType.String,
                    value : "Codigo enviado"
            }]
        };
        callback(null,callMethodResult);
    });
    
    // ESPERAR CONFIGURACION DEL SERVIDOR PARA COMENZAR A EXPONERSE
    await server.start();
    const endpointUrl = server.getEndpointUrl();  // obtener informacion del punto de acceso

    // mostrar en consola la informacion del servidor
    console.log(chalk.yellow("  server on port      :"), chalk.cyan(server.endpoints[0].port.toString()));
    console.log(chalk.yellow("  endpointUrl         :"), chalk.cyan(endpointUrl));
    console.log(chalk.yellow("\n  server now waiting for connections. CTRL+C to stop"));

    console.log(chalk.cyan("visit https://www.sterfive.com for more advanced examples and professional support."));

    // PROCESO DE SALIDA O PARADA DEL SERVIDOR
    process.on("SIGINT", async () => {
        // only work on linux apparently
        await server.shutdown(1000);
        console.log(chalk.red.bold(" shutting down completed "));
        process.exit(-1);
    });
})();

// APP COMUNICACION SERIAL

const Readline = SerialPort.parsers.Readline;
const parser = new Readline();

const mySerial = new SerialPort("COM2",{
    baudRate: 115200
})

mySerial.on('open', function(){
    console.log('puerto serial abierto');
});

mySerial.on('data', function(data){
    let binarios = data;    //buffers recividos
    let datosSerial = binarios.toString();  //Decodificacion a str
    let fin = datosSerial.search('\r\n');
    if(fin != -1){
        strdata = strdata + datosSerial;
        let indX = strdata.search('X');
        let indY = strdata.search('Y');
        let indZ = strdata.search('Z');
        let indArro = strdata.search('@');
        PosX = Number(strdata.slice(indX+2,indY-1));
        PosY = Number(strdata.slice(indY+2,indZ-1));
        PosZ = Number(strdata.slice(indZ+2,indArro-1));
        let indT = strdata.search('T');
        let indTf = strdata.search('/');
        Thot = Number(strdata.slice(indT+2,indTf-1))
        strdata = '';
    }
    else{
        strdata = strdata + datosSerial;
    };
});

mySerial.on('err', function(err){
    console.log(err.message);
});

setInterval(()=>{
    mySerial.write("M114 M105\r\n");
},5000);

// // Comunicacion I2C

// raspi.init(() => {
//   const i2c = new I2C();
//   console.log(i2c.readByteSync(0x18)); // Read one byte from the device at address 18
// });
