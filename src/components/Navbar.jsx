
import ProfileMenu from './ProfileMenu';

export default function Navbar() {
  return (
    <header className="h-14 flex items-center justify-between px-8 border-b bg-[#FAF8FF]">
      <img
        src="/assets/smartgoalAI.png"
        className="pb-1.5 pt-1.5"
        style={{ height: "99%" }} // Adjusted to 80%
      /> 
      {/* <h1 className="text-xl font-bold text-primary">SOAP.AI</h1> */}

      <ProfileMenu onProfile={() => window.dispatchEvent(new CustomEvent('open-profile'))}/>
    </header>
  );
}

