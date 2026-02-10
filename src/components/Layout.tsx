import { useState, type PropsWithChildren } from "react";
import { Col, Container, Nav, Row } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faRobot } from "@fortawesome/free-solid-svg-icons/faRobot";
import { faClock } from "@fortawesome/free-solid-svg-icons/faClock";
import { faDatabase } from "@fortawesome/free-solid-svg-icons/faDatabase";
import { faChartBar } from "@fortawesome/free-solid-svg-icons/faChartBar";
import { faGear } from "@fortawesome/free-solid-svg-icons/faGear";
import { faBars } from "@fortawesome/free-solid-svg-icons/faBars";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";
import "./Layout.css";
import logoUrl from "/logo.png";

interface MenuItemData {
  path: string;
  label: string;
  icon: IconDefinition;
}

const menuItems: MenuItemData[] = [
  { path: "/ai-management", label: "AI Management", icon: faRobot },
  { path: "/fix-qualy-times", label: "Fix Qualy Times", icon: faClock },
  {
    path: "/build-results-database",
    label: "Build Results Database",
    icon: faDatabase,
  },
  {
    path: "/results-database",
    label: "Results Database Viewer",
    icon: faChartBar,
  },
  { path: "/settings", label: "Settings", icon: faGear },
];

const Layout = ({ children }: PropsWithChildren<{}>) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <Container fluid className="vh-100 p-0">
      <Row className="h-100 g-0">
        {/* Mobile hamburger button */}
        <button
          className="mobile-menu-button d-md-none"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <FontAwesomeIcon icon={sidebarOpen ? faTimes : faBars} />
        </button>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="sidebar-overlay d-md-none" onClick={closeSidebar} />
        )}

        <Col
          xs={12}
          md={3}
          className={`bg-dark border-end border-secondary sidebar-col ${sidebarOpen ? "sidebar-open" : ""}`}
        >
          <div className="sidebar">
            <div className="sidebar-header border-bottom border-secondary text-center">
              <img src={logoUrl} alt="R3E Toolbox" className="sidebar-logo" />
            </div>
            <Nav className="flex-column p-2">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `menu-item d-flex align-items-center gap-2 rounded text-decoration-none ${
                      isActive ? "active" : ""
                    }`
                  }
                >
                  <span className="menu-icon">
                    <FontAwesomeIcon icon={item.icon} />
                  </span>
                  <span className="menu-label">{item.label}</span>
                </NavLink>
              ))}
            </Nav>
          </div>
        </Col>
        <Col xs={12} md={9} className="main-content-col">
          <div className="main-content">{children}</div>
        </Col>
      </Row>
    </Container>
  );
};

export default Layout;
