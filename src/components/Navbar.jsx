
import ProfileMenu from './ProfileMenu';

export default function Navbar() {
  return (
    <header className="h-14 flex items-center justify-between px-8 border-b bg-white">
      <h1 className="text-xl font-bold text-primary">SOAP.AI</h1>

      <ProfileMenu onProfile={()=>window.dispatchEvent(new CustomEvent('open-profile'))}/>
    </header>
  );
}
