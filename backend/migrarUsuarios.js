const { MongoClient } = require("mongodb");
const fs = require("fs");

const uri = "mongodb+srv://cristophergiler:rRCAibOffpIamCbj@cluster0.cynpp8v.mongodb.net/"; // Cambia esto si usas MongoDB Atlas u otra configuración
const dbName = "Usuarios";
const collectionName = "usuarios";

async function migrarUsuarios() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const coleccion = db.collection(collectionName);

    const data = fs.readFileSync("./backend/users.json", "utf8");
    const usuarios = JSON.parse(data);

    const resultado = await coleccion.insertMany(usuarios);
    console.log(`Se insertaron ${resultado.insertedCount} usuarios`);
  } catch (err) {
    console.error("Error durante la migración:", err);
  } finally {
    await client.close();
  }
}

migrarUsuarios();