import serial
from multiprocessing import Process

_Port = "COM3"


def Solicitar_Datos():
    try:
        port = serial.Serial(port = _Port, baudrate=115200)
        port.write(b'M114\r\n') #Pedir posicion actual
        Line1 = port.readline()
        port.write(b'M105\r\n') #Pedir temperaturas
        Line2 = port.readline()
        Code = (Line1+Line2).decode()
        print(Code)
    except:
        pass

def ejecutarConTiempoLimite(func, args, time):
    p = Process(target=func, args=args)
    p.start()
    p.join(time)
    if p.is_alive():
        p.terminate()
        # Ha finalizado por timeout
        return False
 
    # Se ha ejecutado correctamente
    return True
 
 
if __name__ == '__main__':
    ejecutarConTiempoLimite(Solicitar_Datos, (), 8.5) # True

#ok X:26 Y:26.22 Z:10 @:0 B@:0
#ok T:26.5 /0.00 B:26.22 /0.00 @:0 B@:0
