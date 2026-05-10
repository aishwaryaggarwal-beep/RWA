import axios from "axios";
import FormData from "form-data";

export async function uploadToIPFS(buffer, filename = "file") {
  const formData = new FormData();

  formData.append("file", buffer, {
    filename,
  });

  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    formData,
    {
      maxBodyLength: Infinity,
      headers: {
        ...formData.getHeaders(), // 🔥 VERY IMPORTANT
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
      },
    }
  );

  return res.data.IpfsHash;
}