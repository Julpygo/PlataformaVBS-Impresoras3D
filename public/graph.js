/* 
CREACION DE VARIABLES PARA LAS GRAFICAS
 */

const socket = io();

// variables para los objetos de graficas
let Pline = null;
// variables para los datos
let data_line = [];
// obtener los canvas
canvas1 = document.getElementById("cvs_line");

const numvalues = 200;
for (let i = 0; i < numvalues; ++i){data_line.push(null);}
/* 
SE UTILIZA LA FUNCION ONLOAD PARA CREAR O INICIALIZAR
LAS GRAFICAS CUANDO SE CARGA LA PAGINA
 */
window.onload = function(){
     // Parametrizar la grafica
     Pline = new RGraph.Line({
          id: 'cvs_line',
          data:data_line,
          options: {
               xaxisLabels: ['Aug 13, 2012','Sep 9 2013','Oct 6 2014'],
               marginLeft: 75,
               marginRight: 55,
               filled: true,
               filledColors: ['#C2D1F0'],
               colors: ['#3366CB'],
               shadow: false,
               tickmarksStyle: null,
               xaxisTickmarksCount: 0,
               backgroundGridVlines: false,
               backgroundGridBorder: false,
               xaxis: false,
               textSize: 16
          }
     }).draw();
};
/* 
FUNCIONES NECESARIAS PARA ACTUALIZAR LAS GRAFICAS
 */
function drawLine(value){
    if (!Pline){return}
    RGraph.Clear(canvas1);
    data_line.push(value);
    if (data_line.length > numvalues){
        data_line = RGraph.arrayShift(data_line); // Estoy descarta el primer valor del array
    }

    Pline.original_data[0] = data_line;
    Pline.draw();
}

/* 
CONECTAR AL SOCKET Y LEER EL MENSAJE
 */
// conexion

socket.on("message", function(dataValue){
    drawLine(dataValue.value);
});
// atender el evento