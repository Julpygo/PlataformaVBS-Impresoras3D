
// node server.js
//IMPORTACION DE LIBRERIAS

const { OPCUAServer, Variant, DataType, nodesets, } = require("node-opcua");
const chalk = require("chalk");
const {spawn} = require('child_process');

//VARIABLES INICIALES

PosX = '';
PosY = '';
PosZ = '';

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

    // INICIALIZACION DEL SERVIDOR
    await server.initialize(); //node server.js 

    const addressSpace = server.engine.addressSpace;
    const rootFolder = addressSpace.findNode("RootFolder");
    const nsCnc = addressSpace.getNamespaceIndex("http://opcfoundation.org/UA/CNC"); //NS DE TYPE CNC(URI)
    const CncInterfaceType = addressSpace.findObjectType("CncInterfaceType",nsCnc);
    const CncAxisType = addressSpace.findObjectType("CncAxisType",nsCnc);

    const namespace = addressSpace.getOwnNamespace();

    //ESPACIO PARA CONSTRUIR Y MAPEAR OBJETOS

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
    const opc40502 = CncInterfaceType.instantiate({
        browseName: "OPC 40502",
        componentOf: impresora,
    });


    const CncAxisList = addressSpace.findNode("ns=1;i=1005");
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

    const IsRotational = addressSpace.findNode("ns=1;i=1014");
    IsRotational.setValueFromSource({ dataType: "Boolean", value: true});

    const PosIndirect = addressSpace.findNode("ns=1;i=1055");
    setInterval(() => {
        PosIndirect.setValueFromSource({dataType: "Float", value: PosX})
    }, 1000);


    //ARRANCA SERVIDOR LISTO PARA CONEXION
    
    await server.start();

    const endpointUrl = server.getEndpointUrl();

    console.log(chalk.yellow("  server on port      :"), chalk.cyan(server.endpoints[0].port.toString()));
    console.log(chalk.yellow("  endpointUrl         :"), chalk.cyan(endpointUrl));
    console.log(chalk.yellow("\n  server now waiting for connections. CTRL+C to stop"));

    console.log(chalk.cyan("\nvisit https://www.sterfive.com for more advanced examples and professional support."));

    process.on("SIGINT", async () => {
        // only work on li  nux apparently
        await server.shutdown(1000);
        console.log(chalk.red.bold(" shutting down completed "));
        process.exit(-1);
    });
})();

// SCRIPT DE PYTHON

setInterval(() => {
    const process1 = spawn('python', ['./Funciones/Sender.py']);
    process1.stdout.on('data', data => {
        datosPy = `${data}`;
        if(datosPy != ''){
            indX = datosPy.search('X');
            indY = datosPy.search('Y');
            indZ = datosPy.search('Z');
            PosX = Number(datosPy.slice(indX+2,indY-1));
            indT = datosPy.search('T');
            indTf = datosPy.search('/');
            Thot = Number(datosPy.slice(indT+2,indTf-1))
            console.log(datosPy);
            console.log(PosX);
            console.log(Thot);
        }
    });     
}, 9000);