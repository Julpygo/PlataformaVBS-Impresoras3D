#Gcodes para monitorizar: M710->G30->Posicion Z, G800-M800->Devuelve datos Gcodes, M31->Tiempo de impresion 
# M43-M43T->Informacionde los pines, M105->informe de temperaturas, M114-> Posicion actual, M119->Estados de endstop 
# M280->Posicion servo, M420->Estado de nivelacion de la cama, M430-> Monitor de potencia(A,V,W) 
# M710->Ajuste o informe del ventilador,  M909-> Valores de impresion de DAC,

#Gcodes utiles: M80->Encender fuente de alimentacion, M81->Apagar fuente, M82->Absoluto, M906->Ajustar corriente del motor (mA)


class gcode_marlin: 

    def __init__(self, port):
        self.port = port      
    
    def Solicitar_Datos(self):
        try:
            self.port.write(b'M114\r\n') #Pedir posicion actual
            Line1 = self.port.readline()
            self.port.write(b'M105\r\n') #Pedir temperaturas
            Line2 = self.port.readline()
            self.Code = (Line1+Line2).decode()
        except:
            pass

    def Enviar_Datos(self):
        if self.Code != '':
            print(self.Code)
        else:
            pass


    


