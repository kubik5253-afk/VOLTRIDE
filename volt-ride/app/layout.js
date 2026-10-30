import "bootstrap/dist/css/bootstrap.min.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata = {
  title: "VOLT RIDE — аренда электросамокатов",
  description: "Найди самокат рядом и отправляйся в поездку."
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
