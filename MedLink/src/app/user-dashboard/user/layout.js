import Footer from '../../components/Footer';
import UserNavbar from '../../components/Navbar/UserNavbar';
import UserLayoutClient from './UserLayoutClient';

export default function UserLayout({ children }) {
  return <UserLayoutClient>{children}</UserLayoutClient>;
}
