# Imagen base oficial de Deno
FROM denoland/deno:2.3.6

# Establece directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos del proyecto al contenedor
COPY . .

# Exponer el puerto 8000
EXPOSE 8000

# Comando para ejecutar tu aplicación Deno
CMD ["run", "dev"]
