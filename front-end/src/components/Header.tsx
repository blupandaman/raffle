import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";

const Header = () => {
    return (
        <div className="navbar bg-base-100 pl-6 pt-6">
            <div className="flex-1">
                <Link href={"/"}>
                    <a className="btn rounded-md shadow-md normal-case text-lg font-bold hover:scale-105">
                        Smart Contract Raffle
                    </a>
                </Link>
            </div>
        </div>
    );
};

export default Header;
