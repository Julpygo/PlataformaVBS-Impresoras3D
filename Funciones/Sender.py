import serial
from multiprocessing import Process

_Port = "COM2"

def Solicitar_Datos():
    try:
        port = serial.Serial(port = _Port, baudrate=115200)
        port.write(b'M114 M105\r\n') #Pedir posicion actual
        Line = port.readline()
        Code = (Line).decode()
        print(Line)
        print(Code)
    except:
        pass

# def Metodo_write():   

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
    ejecutarConTiempoLimite(Solicitar_Datos, (), 20) # True

#ok X:26 Y:26.22 Z:10 @:0 B@:0
#b'ok X:26 Y:26.22 Z:10 @:0 B@:0'
#ok T:26.5 /0.00 B:26.22 /0.00 @:0 B@:0
